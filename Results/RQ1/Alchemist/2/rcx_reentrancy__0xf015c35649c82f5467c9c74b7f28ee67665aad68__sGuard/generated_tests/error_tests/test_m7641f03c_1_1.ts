import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m7641f03c", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();

    // Deploy MY_BANK with Log address as constructor argument
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();

    // Send exactly 2 ether to Put function
    const depositAmount = ethers.parseEther("2");
    const tx = await bank.connect(addr1).Put(0, { value: depositAmount });
    await tx.wait();

    // Get the last logged message from History array
    const historyLength = await logContract.History.length;
    const lastMessage = await logContract.History(historyLength - 1n);

    // Assert that the logged value matches the actual amount sent (2 ether)
    // Mutant would log 2 ether + 1 wei, causing this assertion to fail
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});