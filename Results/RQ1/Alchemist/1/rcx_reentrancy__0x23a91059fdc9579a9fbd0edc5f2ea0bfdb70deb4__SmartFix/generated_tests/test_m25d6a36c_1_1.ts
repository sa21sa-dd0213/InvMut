import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank mutant detection - Deposit log value", function () {
  it("should detect the mutant by verifying the logged deposit value matches the actual deposited amount", async function () {
    const [owner, depositor] = await ethers.getSigners();

    // Deploy the Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy PrivateBank with the Log contract address
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bankInstance = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Get the Log contract instance to query history
    const logContract = await ethers.getContractAt("Log", await logInstance.getAddress());

    // Deposit exactly 2 ether from depositor
    const depositAmount = ethers.parseEther("2");
    const tx = await bankInstance.connect(depositor).Deposit({ value: depositAmount });
    await tx.wait();

    // Get the last log entry from History array
    const historyLength = await logContract.History.length;
    const lastEntry = await logContract.History(historyLength - 1n);

    // The logged Val should equal the deposited amount (2 ether)
    // The mutant logs msg.value+1, so it would log 2 ether + 1 wei
    expect(lastEntry.Val).to.equal(depositAmount);
  });
});