import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test - mb93d900e", function () {
  it("should kill mutant by depositing more than MinSum and attempting to collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WWalletFactory = await ethers.getContractFactory("W_WALLET");
    const wwalletInstance = await WWalletFactory.deploy(await logInstance.getAddress());
    await wwalletInstance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2"); // Greater than MinSum
    
    // Deposit more than MinSum
    await wwalletInstance.connect(addr1).Put(0, { value: depositAmount });
    
    // Check balance is greater than MinSum
    const holder = await wwalletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Advance time to bypass unlockTime (Put with 0 sets unlockTime to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect - should succeed in original but fail in mutant
    // because balance (2 ether) != MinSum (1 ether) in the mutated condition
    await expect(
      wwalletInstance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
    
    // Verify balance unchanged in mutant (since collect failed)
    const holderAfter = await wwalletInstance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});