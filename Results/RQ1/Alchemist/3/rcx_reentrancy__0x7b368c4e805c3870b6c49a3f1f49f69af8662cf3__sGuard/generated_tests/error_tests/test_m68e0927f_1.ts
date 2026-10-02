import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant m68e0927f test", function () {
  it("should revert Collect when unlockTime is in the future even if balance >= MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = ethers.parseEther("1");
    const depositAmount = ethers.parseEther("2");
    const collectAmount = ethers.parseEther("1");
    
    // Fund the contract with some ETH to allow transfers
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // addr1 deposits ETH and sets unlockTime far in the future
    const futureTime = Math.floor(Date.now() / 1000) + 100000; // ~28 hours in future
    await instance.connect(addr1).Put(futureTime, { value: depositAmount });
    
    // Verify balance is >= MinSum
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.be.gte(MinSum);
    
    // Attempt to collect while unlockTime is still in the future
    // Original contract would revert, mutant would incorrectly succeed
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});