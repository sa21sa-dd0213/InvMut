import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - m5deadd9c", function () {
  it("should detect the mutant that subtracts 1 from msg.value in Put function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await logContract.getAddress());
    await instance.waitForDeployment();
    
    // Send exactly 1 wei to Put function via addr1
    const tx = await instance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();
    
    // Check the balance recorded for addr1
    const holder = await instance.Acc(await addr1.getAddress());
    
    // Original contract would set balance to 1, mutant sets it to 0
    // Test passes on original (balance === 1) but fails on mutant (balance === 0)
    expect(holder.balance).to.equal(1);
  });
});