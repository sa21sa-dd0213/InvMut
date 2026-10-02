import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant test - m15a653c7", function () {
  it("should detect mutant by checking balance after sending exactly 1 wei", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Send exactly 1 wei to Put function via addr1
    const tx = await bankInstance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();

    // Check the stored balance for addr1
    const holder = await bankInstance.Acc(addr1.address);

    // Original: balance should be 1 wei
    // Mutant: balance will be 2 wei (msg.value+1)
    expect(holder.balance).to.equal(1);
  });
});