import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - m74b73f34", function () {
  it("should kill mutant by requiring balance > MinSum for Collect", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy BANK_SAFE (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy LogFile (required for deposit/collect operations)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Setup: Set MinSum and LogFile, then initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();

    // addr1 deposits exactly 15 ether (greater than MinSum of 10)
    await instance.connect(addr1).Deposit({ value: ethers.parseEther("15") });

    // Verify balance is 15
    expect(await instance.balances(addr1.address)).to.equal(ethers.parseEther("15"));

    // Try to collect 5 ether - should succeed in original but fail in mutant
    // because mutant requires balance == MinSum (10), not >= MinSum
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("5"))
    ).to.be.reverted;
  });
});