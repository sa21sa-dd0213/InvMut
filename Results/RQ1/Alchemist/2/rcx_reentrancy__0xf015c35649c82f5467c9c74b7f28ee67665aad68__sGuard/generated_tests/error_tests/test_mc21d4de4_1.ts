import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test for mc21d4de4", function () {
  it("should kill the mutant by depositing more than MinSum and then collecting", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const bank = await Factory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Get MinSum value (1 ether)
    const minSum = await bank.MinSum();
    expect(minSum).to.equal(ethers.parseEther("1"));
    
    // Deposit 2 ether (more than MinSum) into the contract
    const depositAmount = ethers.parseEther("2");
    await bank.connect(user).Put(0, { value: depositAmount });
    
    // Check the balance is 2 ether (greater than MinSum)
    const holder = await bank.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    // because mutant requires acc.balance == MinSum (exactly 1 ether)
    const collectAmount = ethers.parseEther("1");
    
    // The mutant will revert because balance (2 ether) != MinSum (1 ether)
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});