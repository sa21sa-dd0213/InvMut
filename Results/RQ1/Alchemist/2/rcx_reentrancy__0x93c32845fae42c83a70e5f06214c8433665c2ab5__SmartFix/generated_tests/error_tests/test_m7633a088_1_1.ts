import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m7633a088 detection", function () {
  it("should detect the off-by-one error in Put by checking exact balance after sending a specific amount", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with the Log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();

    // Send exactly 2 ether to Put function
    const sendAmount = ethers.parseEther("2");
    const tx = await wallet.connect(user).Put(0, { value: sendAmount });
    await tx.wait();

    // Get the stored balance for the user
    const holder = await wallet.Acc(user.address);
    const storedBalance = holder.balance;

    // Original would store exactly 2 ether; mutant stores 2 ether + 1 wei
    expect(storedBalance).to.equal(sendAmount);
  });
});