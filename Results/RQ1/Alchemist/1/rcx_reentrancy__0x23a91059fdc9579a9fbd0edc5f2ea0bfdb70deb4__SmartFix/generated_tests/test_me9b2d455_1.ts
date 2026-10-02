import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection test", function () {
  it("should kill mutant me9b2d455 by depositing amount greater than MinDeposit and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await privateBank.waitForDeployment();
    
    // Get the MinDeposit value
    const minDeposit = await privateBank.MinDeposit();
    
    // Deposit amount greater than MinDeposit (2 ether when MinDeposit is 1 ether)
    const depositAmount = minDeposit + ethers.parseEther("1");
    
    // This should succeed on original (deposit >= MinDeposit)
    // But should fail on mutant (deposit <= MinDeposit is false)
    await expect(
      privateBank.connect(addr1).Deposit({ value: depositAmount })
    ).to.not.be.reverted;
    
    // Verify the balance increased as expected
    const balance = await privateBank.balances(addr1.address);
    expect(balance).to.equal(depositAmount);
  });
});