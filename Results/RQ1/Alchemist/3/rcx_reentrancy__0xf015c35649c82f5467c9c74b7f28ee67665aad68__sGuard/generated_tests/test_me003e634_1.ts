import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant kill test - me003e634", function () {
  it("should kill mutant by using balance exactly equal to MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // Fund user with exactly MinSum (1 ether)
    await instance.connect(user).Put(0, { value: MinSum });
    
    // Verify balance is exactly MinSum
    const holder = await instance.Acc(user.address);
    expect(holder.balance).to.equal(MinSum);
    
    // Try to collect exactly MinSum - should succeed on original but fail on mutant
    // Mutant requires acc.balance > MinSum, so with balance == MinSum it should revert
    await expect(
      instance.connect(user).Collect(MinSum)
    ).to.be.reverted;
  });
});