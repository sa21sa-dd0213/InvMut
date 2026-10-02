import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m9a254e2a test", function () {
  it("should revert when Collect is called with amount less than MinSum on original, but succeed on mutant", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Fund the contract so it has ether to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // User puts 0.5 ether (less than MinSum = 1 ether)
    const putAmount = ethers.parseEther("0.5");
    await instance.connect(user).Put(0, { value: putAmount });

    // Now try to collect 0.5 ether - should revert in original but succeed in mutant
    // because mutant removes the MinSum check
    await expect(
      instance.connect(user).Collect(putAmount)
    ).to.be.reverted;
  });
});