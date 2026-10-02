import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant m8ddea4ca detection", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the LogFile address
    const logAddress = await instance.Log();
    const logFactory = await ethers.getContractFactory("LogFile");
    const logInstance = logFactory.attach(logAddress);

    // Deposit exactly 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    await instance.connect(addr1).Deposit({ value: depositAmount });

    // Check the logged value - original would log 1 wei, mutant logs 2 wei
    const lastMessage = await logInstance.History(0);
    expect(lastMessage.Val).to.equal(depositAmount);
  });
});