import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant detection", function () {
  it("should detect mutant that changes >= to == in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy MONEY_BOX (no constructor arguments needed based on contract code)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Log contract (needed for LogFile reference)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Initialize the contract: set MinSum, LogFile, and mark as initialized
    await (await instance.SetMinSum(ethers.parseEther("1"))).wait();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.Initialized()).wait();
    
    // User deposits 10 ETH
    await (await instance.connect(user).Put(0, { value: ethers.parseEther("10") })).wait();
    
    // Advance time past the unlock time (which is block.timestamp since lockTime=0)
    await ethers.provider.send("evm_increaseTime", [3600]); // 1 hour
    await ethers.provider.send("evm_mine", []);
    
    // User tries to collect 5 ETH (less than balance)
    // Original: should succeed (5 >= 5 is true)
    // Mutant: should revert (5 == 10 is false)
    const collectTx = instance.connect(user).Collect(ethers.parseEther("5"));
    
    // The mutant will revert, so we expect a revert
    await expect(collectTx).to.be.reverted;
  });
});