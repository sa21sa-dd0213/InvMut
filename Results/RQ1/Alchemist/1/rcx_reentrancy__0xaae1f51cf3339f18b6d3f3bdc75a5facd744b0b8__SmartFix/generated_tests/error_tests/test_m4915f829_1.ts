import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant m4915f829 test", function () {
  it("should kill mutant by withdrawing exactly the balance when balance equals MinSum", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy DEP_BANK (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy LogFile contract (required for DEP_BANK to work)
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set up the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("10"));
    await instance.connect(owner).Initialized();
    
    // User deposits exactly 10 ETH
    await instance.connect(user).Deposit({ value: ethers.parseEther("10") });
    
    // Verify user balance is 10 ETH and MinSum is 10 ETH
    expect(await instance.balances(user.address)).to.equal(ethers.parseEther("10"));
    expect(await instance.MinSum()).to.equal(ethers.parseEther("10"));
    
    // User attempts to withdraw exactly their balance (10 ETH)
    // In original: balances[msg.sender] >= MinSum (10 >= 10) && balances[msg.sender] >= _am (10 >= 10) -> true, withdraw succeeds
    // In mutant: balances[msg.sender] >= MinSum (10 >= 10) && balances[msg.sender] > _am (10 > 10) -> false, withdraw fails
    await expect(
      instance.connect(user).Collect(ethers.parseEther("10"))
    ).to.be.reverted;
  });
});