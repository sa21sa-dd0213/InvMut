import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44c98592", function () {
  it("should revert when withdrawAll is called by a contract that rejects ether", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a malicious contract that always reverts on receive
    const RevertingReceiverFactory = await ethers.getContractFactory("contracts/test/RevertingReceiver.sol:RevertingReceiver");
    const revertingReceiver = await RevertingReceiverFactory.deploy();
    await revertingReceiver.waitForDeployment();

    // Fund the reverting receiver via deposit
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(revertingReceiver).deposit({ value: depositAmount });

    // Attempt withdrawAll - should revert in original but pass in mutant
    await expect(
      instance.connect(revertingReceiver).withdrawAll()
    ).to.be.reverted;
  });
});