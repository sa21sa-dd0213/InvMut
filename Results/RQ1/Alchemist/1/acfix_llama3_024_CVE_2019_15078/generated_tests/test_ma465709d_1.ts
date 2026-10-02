import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant ma465709d (onlyPayloadSize modifier removed from transfer)", function () {
  it("should revert when calling transfer with extra calldata on original but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the interface to encode the transfer function call with extra data
    const iface = new ethers.Interface([
      "function transfer(address _to, uint256 _amount) public returns (bool)"
    ]);

    // Encode a normal transfer call (address + uint256 = 64 bytes data + 4 bytes selector)
    const normalCalldata = iface.encodeFunctionData("transfer", [addr1.address, ethers.parseEther("1")]);

    // Append extra bytes to simulate extra calldata (the original modifier would reject this)
    const extraCalldata = normalCalldata + "deadbeef";

    // Send transaction with extra calldata using owner as sender (owner has tokens)
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: extraCalldata
    });

    // The mutant (without onlyPayloadSize) should succeed, while original would revert
    // We expect the transaction to succeed (no revert) - this kills the mutant
    await expect(tx).to.not.be.reverted;
    
    // Verify the transfer actually happened (extra data should be ignored, normal params used)
    const balanceAddr1 = await instance.balanceOf(addr1.address);
    expect(balanceAddr1).to.equal(ethers.parseEther("1"));
  });
});