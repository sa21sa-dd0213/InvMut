import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m7641f03c test", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    // Send exactly 1 ether to the Put function
    const depositAmount = ethers.parseEther("1");
    const tx = await bankInstance.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();
    
    // Check the logged value in the Log contract's History array
    const loggedMessage = await logInstance.History(0);
    
    // Original contract would log depositAmount, mutant logs depositAmount + 1
    // This assertion passes on original, fails on mutant
    expect(loggedMessage.Val).to.equal(depositAmount);
  });
});