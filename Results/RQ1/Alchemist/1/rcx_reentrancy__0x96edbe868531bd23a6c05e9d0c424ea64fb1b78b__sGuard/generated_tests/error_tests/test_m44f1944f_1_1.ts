import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m44f1944f test", function () {
  it("should kill mutant by demonstrating balance > MinSum allows Collect in original but fails in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy LogFile first (required for PENNY_BY_PENNY constructor)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy PENNY_BY_PENNY
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).SetLogFile(await log.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).Initialized();

    // addr1 deposits 2 ETH (balance > MinSum of 1 ETH)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("2") });

    // Verify balance is greater than MinSum
    const acc = await instance.Acc(addr1.address);
    expect(acc.balance).to.equal(ethers.parseEther("2"));

    // Attempt to collect 1 ETH - should succeed in original (balance >= MinSum)
    // but should revert in mutant (balance <= MinSum is false since 2 > 1)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;

    // Verify balance remained unchanged (collect failed)
    const accAfter = await instance.Acc(addr1.address);
    expect(accAfter.balance).to.equal(ethers.parseEther("2"));
  });
});