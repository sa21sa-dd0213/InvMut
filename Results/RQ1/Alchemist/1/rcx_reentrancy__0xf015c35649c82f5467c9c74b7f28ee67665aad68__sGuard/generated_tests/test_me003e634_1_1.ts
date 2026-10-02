import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - me003e634", function () {
  it("should revert when balance equals MinSum (1 ether) due to > instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor arg for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    
    // User deposits exactly MinSum (1 ether)
    await bank.connect(user).Put(0, { value: MinSum });
    
    // Verify balance is exactly MinSum
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(MinSum);
    
    // Attempt to collect 1 wei - should succeed in original but fail in mutant
    // because mutant requires acc.balance > MinSum (strictly greater)
    await expect(
      bank.connect(user).Collect(1)
    ).to.be.reverted;
  });
});