import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant test - m3e63990b", function () {
  it("should revert when called from unauthorized address (kills mutant that removes owner check)", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const receiver = ethers.Wallet.createRandom().address;
    const amount = ethers.parseEther("0.1");

    // Unauthorized call should revert on original, but mutant allows it
    await expect(
      instance.connect(unauthorized).sendTo(receiver, amount)
    ).to.be.reverted;
  });
});