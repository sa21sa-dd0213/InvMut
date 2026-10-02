import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m1979f4bf test", function () {
  it("should kill mutant by depositing > MinSum and then collecting", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Verify MinSum is 1 ether
    expect(await bankInstance.MinSum()).to.equal(ethers.parseEther("1"));
    
    // User deposits 2 ether (greater than MinSum) with unlock time in future
    const futureTime = Math.floor(Date.now() / 1000) + 1000;
    const depositTx = await bankInstance.connect(user).Put(futureTime, { value: ethers.parseEther("2") });
    await depositTx.wait();
    
    // Verify balance is 2 ether
    const holder = await bankInstance.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    
    // Fast forward time past unlock time
    await ethers.provider.send("evm_increaseTime", [1001]);
    await ethers.provider.send("evm_mine", []);
    
    // Attempt to collect 1 ether - should succeed on original but fail on mutant
    // because mutant requires balance <= MinSum (1 ether) but balance is 2 ether
    await expect(
      bankInstance.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});