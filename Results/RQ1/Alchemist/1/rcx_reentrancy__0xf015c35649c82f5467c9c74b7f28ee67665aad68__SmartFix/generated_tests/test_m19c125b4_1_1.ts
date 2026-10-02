import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant m19c125b4 (Put: + replaced with *)", function () {
  it("should kill the mutant by calling Put with 0 ether from an address with existing balance", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with the Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // First, addr1 sends 1 ether to create a positive balance
    const tx1 = await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await tx1.wait();

    // Now addr1 tries to call Put with 0 ether - this should pass on original (balance + 0 >= balance)
    // but will revert on mutant (balance * 0 >= balance will fail since 0 >= 1 ether is false)
    await expect(
      instance.connect(addr1).Put(0, { value: 0 })
    ).to.be.reverted;
  });
});