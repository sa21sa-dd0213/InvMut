import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant m92a0c61b test", function () {
  it("should allow zero-value deposit (kill mutant that uses > instead of >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum and LogFile to allow the contract to be initialized
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    await instance.SetMinSum(0);
    await instance.SetLogFile(await logInstance.getAddress());
    await instance.Initialized();

    // Attempt a zero-value deposit - should succeed in original but revert in mutant
    await expect(instance.Deposit({ value: 0 })).to.not.be.reverted;
    
    // Also verify the balance wasn't changed (remains 0)
    const balance = await instance.balances(owner.address);
    expect(balance).to.equal(0);
  });
});