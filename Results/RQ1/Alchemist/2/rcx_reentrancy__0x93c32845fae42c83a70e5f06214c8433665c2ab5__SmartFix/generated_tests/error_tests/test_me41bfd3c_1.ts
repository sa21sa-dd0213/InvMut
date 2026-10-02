import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET - kill mutant me41bfd3c (Collect balance==_am instead of balance>=_am)", function () {
  it("should revert when trying to withdraw less than full balance (balance > _am)", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const depositAmount = ethers.parseEther("5"); // 5 ether
    const withdrawAmount = ethers.parseEther("2"); // 2 ether
    
    // User deposits 5 ether (more than MinSum = 1 ether)
    await wallet.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is 5 ether
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to withdraw 2 ether (which is less than full balance of 5 ether)
    // Original: should succeed (5 >= 2)
    // Mutant: should revert (5 != 2)
    await expect(
      wallet.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});