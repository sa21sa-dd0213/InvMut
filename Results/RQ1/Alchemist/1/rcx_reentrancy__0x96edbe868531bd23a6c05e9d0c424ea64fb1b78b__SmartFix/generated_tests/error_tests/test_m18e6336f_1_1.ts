import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m18e6336f - balance > MinSum change", function () {
  it("should revert when balance equals MinSum (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a LogFile contract (required by PENNY_BY_PENNY)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Set up the contract
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.SetMinSum(ethers.parseEther("1")); // MinSum = 1 ETH
    await instance.Initialized();

    // addr1 deposits exactly 1 ETH (balance = MinSum)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });

    // Try to collect 1 ETH - should succeed on original (>=) but fail on mutant (>)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});