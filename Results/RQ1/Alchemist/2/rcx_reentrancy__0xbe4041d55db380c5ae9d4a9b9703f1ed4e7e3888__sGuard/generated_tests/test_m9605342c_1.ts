import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m9605342c test", function () {
  it("should detect the mutant by checking Collect with balance > MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
    
    // Initialize the contract
    await instance.Initialized();

    // Deploy Log contract
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set LogFile
    await instance.SetLogFile(await logInstance.getAddress());

    // Addr1 puts 2 ether with lock time 0 (unlock immediately)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });

    // Now addr1 tries to collect 1 ether
    // Original: balance (2) >= MinSum (1) → true → success
    // Mutant:  balance (2) == MinSum (1) → false → revert
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});