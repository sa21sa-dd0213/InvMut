import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO - Kill mutant m44c98592", function () {
  it("should revert when withdrawAll is called by a contract that rejects Ether", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the ReentrancyDAO contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Deploy a malicious receiver contract that always reverts on receive
    const MaliciousReceiver = await ethers.getContractFactory(
      "contracts/MaliciousReceiver.sol:MaliciousReceiver"
    );
    const receiver = await MaliciousReceiver.deploy();
    await receiver.waitForDeployment();

    // Fund the malicious contract so it can deposit
    await owner.sendTransaction({
      to: await receiver.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Deposit Ether into DAO from the malicious receiver
    await receiver.connect(owner).depositToDAO(await dao.getAddress(), {
      value: ethers.parseEther("1.0")
    });

    // Attempt to withdrawAll - should revert because receiver rejects Ether
    await expect(
      receiver.connect(owner).withdrawFromDAO(await dao.getAddress())
    ).to.be.reverted;
  });
});