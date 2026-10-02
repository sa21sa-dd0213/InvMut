import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant kill test", function () {
  it("should kill mutant m0ed94428 by calling Collect with balance > MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: set MinSum and initialize
    const minSum = ethers.parseEther("1.0");
    await instance.SetMinSum(minSum);
    await instance.Initialized();

    // Deploy LogFile for logging
    const LogFactory = await ethers.getContractFactory("LogFile");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // Deposit 2 ETH (balance > MinSum)
    const depositAmount = ethers.parseEther("2.0");
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Attempt Collect with 1 ETH (balance is 2, MinSum is 1, so balance > MinSum)
    const collectAmount = ethers.parseEther("1.0");
    
    // Original would succeed, mutant reverts because balance != MinSum
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;

    // Verify balance decreased
    const finalBalance = await instance.balances(addr1.address);
    expect(finalBalance).to.equal(ethers.parseEther("1.0"));
  });
});