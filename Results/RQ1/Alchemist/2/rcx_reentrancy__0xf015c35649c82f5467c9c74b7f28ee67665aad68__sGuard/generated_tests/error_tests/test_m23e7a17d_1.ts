import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - kill mutant m23e7a17d", function () {
  it("should allow withdrawal after unlock time (mutant uses < instead of >)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddr = await bank.getAddress();
    
    // Fund addr1 with some ether
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("10")
    });
    
    // Set unlock time to current block timestamp + 10 seconds
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock!.timestamp + 10;
    
    // addr1 deposits 2 ether with unlock time
    await bank.connect(addr1).Put(unlockTime, {
      value: ethers.parseEther("2")
    });
    
    // Wait for unlock time to pass
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Now attempt to collect 1 ether - should succeed in original, fail in mutant
    // because mutant requires block.timestamp < unlockTime
    const tx = bank.connect(addr1).Collect(ethers.parseEther("1"));
    
    // In the original, this succeeds. The mutant would revert because 
    // block.timestamp (unlockTime+1) is NOT less than unlockTime
    await expect(tx).to.not.be.reverted;
    
    // Verify balance was reduced
    const holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});