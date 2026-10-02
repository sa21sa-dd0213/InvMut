import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant me2c18b9c - remove onlyPayloadSize modifier from transfer", function () {
  it("should revert when transfer is called with extra calldata on original, but succeed on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: give owner some tokens via NETM() function
    await instance.NETM();

    // Get the function selector for transfer(address,uint256)
    const transferSelector = ethers.id("transfer(address,uint256)").slice(0, 10);

    // Encode the normal parameters: _to = addr1, _amount = 1000 wei
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const normalParams = abiCoder.encode(
      ["address", "uint256"],
      [addr1.address, ethers.parseEther("1000")]
    );

    // Create calldata with extra bytes appended (malicious payload)
    const extraData = ethers.randomBytes(32); // 32 extra bytes
    const maliciousCalldata = transferSelector + normalParams.slice(2) + ethers.hexlify(extraData).slice(2);

    // Send the transaction with extra calldata
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      data: maliciousCalldata,
    });

    // On the original contract, this should revert due to onlyPayloadSize check
    // On the mutant, it will succeed (no check)
    // We expect the mutant to NOT revert, so we check the receipt status
    const receipt = await tx.wait();

    // The mutant will have a successful transaction (status 1)
    // The original would revert (status 0) - but since we're testing the mutant,
    // we expect success, which kills the mutant
    expect(receipt.status).to.equal(1);

    // Verify that the transfer actually happened on the mutant
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("1000"));
  });
});