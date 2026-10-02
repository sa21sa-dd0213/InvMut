import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant m21d7e0f0 test", function () {
  it("should revert when depositing any positive amount due to mutated require condition", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await privateBank.waitForDeployment();
    
    // Attempt to deposit exactly the minimum deposit (1 ether)
    const depositAmount = ethers.parseEther("1");
    
    // The mutant changes >= to ==, so require((balance + deposit) == balance)
    // will always fail for any positive deposit amount
    await expect(
      privateBank.connect(owner).Deposit({ value: depositAmount })
    ).to.be.reverted;
    
    // Verify balance remains zero
    const balance = await privateBank.balances(owner.address);
    expect(balance).to.equal(0);
  });
});