import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant test - mc535433c", function () {
  it("should detect the mutant where >= was changed to > in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const collectAmount = ethers.parseEther("2");
    
    // Deposit exactly 2 ether
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Verify balance is exactly 2 ether
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Try to collect exactly the same amount (2 ether)
    // In the original: acc.balance >= _am would pass (2 >= 2)
    // In the mutant: acc.balance > _am would fail (2 > 2 is false)
    const tx = bank.connect(user).Collect(collectAmount);
    
    // The mutant should revert because 2 > 2 is false
    await expect(tx).to.be.reverted;
    
    // Verify balance remains unchanged (no funds transferred)
    const holderAfter = await bank.Acc(user.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});