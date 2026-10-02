import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m5edbf6e5", function () {
  it("should detect mutant where Put function subtracts 1 from msg.value", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address as constructor argument
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const xWalletInstance = await XWalletFactory.deploy(await logInstance.getAddress());
    await xWalletInstance.waitForDeployment();

    // Send exactly 1 wei to Put function
    const tx = await xWalletInstance.connect(addr1).Put(0, { value: 1 });
    await tx.wait();

    // Check the balance stored in Acc mapping for addr1
    // In original: balance should be 1
    // In mutant: balance will be 0 (msg.value - 1 = 0)
    const holder = await xWalletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(1);
  });
});