import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m93a330d4 detection", function () {
  it("should detect mutated LogFile value by verifying logged amount matches msg.value exactly", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy LogFile first (needed as constructor argument for PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();
    
    // Deploy PENNY_BY_PENNY with LogFile address
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();
    
    // Initialize the contract (required before Put can be called meaningfully)
    await (await penny.SetLogFile(await logFile.getAddress())).wait();
    await (await penny.Initialized()).wait();
    
    // Send exactly 100 wei to Put function
    const testAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const tx = await penny.connect(owner).Put(0, { value: testAmount });
    await tx.wait();
    
    // Read the last entry from LogFile's History array
    const historyLength = await logFile.History.length;
    const lastEntry = await logFile.History(historyLength - 1n);
    
    // The mutant logs msg.value+1, so original logs 100 wei, mutant logs 101 wei
    // Assert that the logged value matches the actual sent amount
    expect(lastEntry.Val).to.equal(testAmount);
  });
});