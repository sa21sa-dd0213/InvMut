import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m94d16216", function () {
  it("should detect mutant that logs msg.value+1 instead of msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();

    // Call Put with a specific amount (e.g., 5 ether)
    const putAmount = ethers.parseEther("5");
    const tx = await instance.connect(addr1).Put(0, { value: putAmount });
    await tx.wait();

    // Get the logged message from the Log contract
    // The Log contract stores History array, we need the last entry
    const historyLength = await logInstance.History.length;
    const lastMessage = await logInstance.History(historyLength - 1n);

    // The logged Val should equal exactly the amount sent (msg.value)
    // In the mutant, it would be msg.value + 1 (5 ether + 1 wei)
    expect(lastMessage.Val).to.equal(putAmount);
  });
});