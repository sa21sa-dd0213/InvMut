import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank - Kill mutant m7a9eab2f (CashOut: subtraction replaced with division)", function () {
  it("should fail on mutant when cashing out half of deposited amount and checking remaining balance", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bank = await PrivateBankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const cashOutAmount = ethers.parseEther("1");
    const expectedRemaining = ethers.parseEther("1");
    
    // Deposit 2 ether from user
    await bank.connect(user).deposit({ value: depositAmount });
    
    // Verify initial balance
    expect(await bank.balances(user.address)).to.equal(depositAmount);
    
    // Cash out 1 ether
    await bank.connect(user).cashOut(cashOutAmount);
    
    // Check remaining balance - on original should be 1 ether, on mutant would be 2/1 = 2 ether
    const remainingBalance = await bank.balances(user.address);
    expect(remainingBalance).to.equal(expectedRemaining);
  });
});