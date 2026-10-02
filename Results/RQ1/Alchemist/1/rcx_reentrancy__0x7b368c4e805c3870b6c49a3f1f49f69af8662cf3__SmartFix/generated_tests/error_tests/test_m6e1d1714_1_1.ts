import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m6e1d1714", function () {
  it("should detect mutant that logs msg.value-1 instead of msg.value in Put function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy W_WALLET with Log contract address
    const WWalletFactory = await ethers.getContractFactory("W_WALLET");
    const wwalletInstance = await WWalletFactory.deploy(await logInstance.getAddress());
    await wwalletInstance.waitForDeployment();

    const putAmount = ethers.parseEther("1");

    // Call Put with exactly 1 ether
    const tx = await wwalletInstance.connect(user).Put(0, { value: putAmount });
    await tx.wait();

    // Read the last entry from Log contract's History array (index 0 since first call)
    const [sender, data, val, time] = await logInstance.History(0);

    // The logged value should equal the exact msg.value sent (1 ether)
    // Mutant logs msg.value-1, so this assertion will fail on mutant
    expect(val).to.equal(putAmount);
  });
});