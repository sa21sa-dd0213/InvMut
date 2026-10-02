import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test", function () {
  it("should allow a user with sufficient balance to collect funds when condition is met", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy contracts - LogFile has no constructor, PRIVATE_ETH_CELL has no constructor
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const CellFactory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const cell = await CellFactory.deploy();
    await cell.waitForDeployment();
    
    // Setup: Set MinSum and LogFile, then initialize
    await cell.SetMinSum(ethers.parseEther("1"));
    await cell.SetLogFile(await log.getAddress());
    await cell.Initialized();
    
    // User deposits 2 ETH (above MinSum of 1 ETH)
    const depositAmount = ethers.parseEther("2");
    await cell.connect(user).Deposit({ value: depositAmount });
    
    // User tries to collect 1 ETH (balances >= MinSum and balances >= _am)
    const collectAmount = ethers.parseEther("1");
    const userBalanceBefore = await cell.balances(user.address);
    
    // This should succeed on original, fail on mutant (mutant always reverts)
    await expect(cell.connect(user).Collect(collectAmount)).to.not.be.reverted;
    
    // Verify balance decreased correctly
    const userBalanceAfter = await cell.balances(user.address);
    expect(userBalanceAfter).to.equal(userBalanceBefore - collectAmount);
  });
});