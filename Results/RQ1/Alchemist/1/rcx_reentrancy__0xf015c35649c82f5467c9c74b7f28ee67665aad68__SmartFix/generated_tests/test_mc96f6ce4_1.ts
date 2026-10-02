import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mc96f6ce4 detection", function () {
  it("should detect mutant by comparing unlockTime to block.timestamp when _unlockTime is 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlock("latest");
    const currentTimestamp = blockNumBefore.timestamp;
    
    // Call Put with _unlockTime = 0 and some ETH
    const putTx = await bank.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    await putTx.wait();
    
    // Get the unlockTime stored for addr1
    const holder = await bank.Acc(addr1.address);
    const storedUnlockTime = holder.unlockTime;
    
    // In original: unlockTime should be >= current block.timestamp
    // In mutant: unlockTime may be 0 or some other value not tied to timestamp
    // This assertion will pass on original but likely fail on mutant
    expect(storedUnlockTime).to.be.at.least(currentTimestamp);
    
    // Additional check: unlockTime should not be 0 when _unlockTime was 0
    expect(storedUnlockTime).to.not.equal(0);
  });
});