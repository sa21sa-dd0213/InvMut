import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test m40a1c0eb", function () {
  it("should revert when Collect is called with insufficient balance or before unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // First put some ETH into the contract for addr1
    const putAmount = ethers.parseEther("2");
    await instance.connect(addr1).Put(0, { value: putAmount });
    
    // Try to collect more than the balance - should revert on original but pass on mutant
    const collectAmount = ethers.parseEther("3");
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
    
    // Try to collect before unlock time - should revert on original but pass on mutant
    const unlockTime = Math.floor(Date.now() / 1000) + 1000;
    await instance.connect(addr1).Put(unlockTime, { value: ethers.parseEther("1") });
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
    
    // Try to collect when balance is below MinSum (1 ether)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("0.5") });
    // Withdraw some to bring balance below 1 ether
    await instance.connect(addr1).Collect(ethers.parseEther("1.5"));
    // Now balance should be 1 ether, try to collect more
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1.5"))
    ).to.be.reverted;
  });
});