import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m9e3e6d34", function () {
  it("should detect mutant that changes >= to == in Put function require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get initial balance of addr1
    const initialBalance = await ethers.provider.getBalance(addr1.address);
    
    // Send a non-zero amount to Put function via fallback (calls Put(0))
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await tx.wait();
    
    // Verify the deposit was successful by checking balance in Acc mapping
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("1.0"));
    
    // Verify the unlockTime was set correctly (should be block.timestamp since _unlockTime=0)
    const block = await ethers.provider.getBlock(tx.blockNumber);
    expect(holder.unlockTime).to.equal(block.timestamp);
    
    // If we reach here, the deposit succeeded - mutant would revert, killing it
    console.log("Test passed: deposit with non-zero value succeeded, mutant would be killed");
  });
});