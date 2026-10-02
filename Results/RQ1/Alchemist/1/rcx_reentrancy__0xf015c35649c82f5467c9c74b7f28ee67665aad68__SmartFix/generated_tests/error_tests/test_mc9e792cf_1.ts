import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mc9e792cf by collecting exactly the deposited amount", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    // Deposit exactly 1 ether (MinSum) from addr1
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is exactly 1 ether
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    
    // Attempt to collect exactly the deposited amount (should succeed in original, fail in mutant)
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.not.be.reverted;
  });
});