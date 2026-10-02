import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m42fec968 test", function () {
  it("should kill the mutant by exploiting block.prevrandao instead of block.timestamp in Put", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const bankAddress = await bankInstance.getAddress();
    
    // Fund addr1 with some ether
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("10")
    });
    
    // Step 1: Put ether with _unlockTime = 0 (which is <= block.timestamp)
    // In original: unlockTime becomes block.timestamp
    // In mutant: unlockTime becomes block.prevrandao (random large number)
    const depositAmount = ethers.parseEther("2");
    await bankInstance.connect(addr1).Put(0, { value: depositAmount });
    
    // Step 2: Check the unlockTime set for addr1
    const holder = await bankInstance.Acc(addr1.address);
    const unlockTime = holder.unlockTime;
    
    // Step 3: Try to collect the deposit immediately
    // In original: should succeed because block.timestamp > unlockTime (which was block.timestamp)
    // In mutant: should revert because block.timestamp < unlockTime (which is block.prevrandao, a huge number)
    await expect(
      bankInstance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
    
    // Verify that the balance was NOT reduced (since Collect should have failed)
    const holderAfter = await bankInstance.Acc(addr1.address);
    expect(holderAfter.balance).to.equal(depositAmount);
  });
});