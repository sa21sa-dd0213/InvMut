import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant mcb4fd229 (Collect: >= changed to ==)", function () {
  it("should allow withdrawal of amount less than balance (kills mutant that requires exact equality)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // User deposits 2 ether (more than MinSum of 1 ether)
    const depositAmount = ethers.parseEther("2");
    await bankInstance.connect(user).Put(0, { value: depositAmount });
    
    // Verify user's balance is 2 ether
    const holderInfo = await bankInstance.Acc(user.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Attempt to withdraw only 1 ether (less than full balance)
    const withdrawAmount = ethers.parseEther("1");
    
    // This should succeed on original (>= allows partial withdrawal) but fail on mutant (== requires exact match)
    await expect(
      bankInstance.connect(user).Collect(withdrawAmount)
    ).to.not.be.reverted;
    
    // Verify that 1 ether was withdrawn
    const updatedHolder = await bankInstance.Acc(user.address);
    expect(updatedHolder.balance).to.equal(ethers.parseEther("1"));
  });
});