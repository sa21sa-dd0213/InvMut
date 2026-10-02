import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant m178aa09a test", function () {
  it("should successfully deposit Ether (original behavior) but mutant reverts due to subtraction overflow check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy LogFile first (needed as constructor argument for PRIVATE_ETH_CELL)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PRIVATE_ETH_CELL
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Initialize the contract by setting MinSum and Log, then mark as initialized
    await instance.connect(owner).SetMinSum(ethers.parseEther("1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();
    
    // Attempt to deposit a non-zero amount - this should revert on the mutant
    // because the mutated require statement checks (balance - msg.value >= balance)
    // which is always false for any positive msg.value
    const depositAmount = ethers.parseEther("1");
    
    await expect(
      instance.connect(addr1).Deposit({ value: depositAmount })
    ).to.be.reverted;
  });
});