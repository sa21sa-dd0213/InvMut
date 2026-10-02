import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - kill mutant m1dcfcfa0 (transferFrom without onlyPayloadSize)", function () {
  it("should revert when calling transferFrom with insufficient calldata (original has onlyPayloadSize modifier, mutant does not)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Approve addr1 to spend owner's tokens
    await instance.approve(addr1.address, ethers.parseEther("1000"));

    // Encode the transferFrom call manually with short calldata (less than 100 bytes)
    // Function selector for transferFrom(address,address,uint256) = 0x23b872dd
    const iface = new ethers.Interface(["function transferFrom(address,address,uint256)"]);
    const encodedCall = iface.encodeFunctionData("transferFrom", [
      owner.address,
      addr2.address,
      ethers.parseEther("100")
    ]);

    // Truncate calldata to 50 bytes (less than required 100 bytes)
    const shortCalldata = "0x" + encodedCall.slice(2).slice(0, 50);

    // Send raw transaction with truncated calldata
    const tx = await owner.sendTransaction({
      to: instance.target,
      data: shortCalldata,
      gasLimit: 100000
    });

    // The original contract would revert due to onlyPayloadSize assertion failing
    // The mutant would not revert because modifier is removed
    // Wait for transaction and check if it was reverted or not
    await expect(tx.wait()).to.be.reverted;
  });
});