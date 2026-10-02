import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m9afa7601 detection", function () {
  it("should detect mutant where _s is replaced with false in Collect function", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    const walletAddress = await walletInstance.getAddress();

    // Get initial balances
    const initialUserBalance = await ethers.provider.getBalance(user.address);
    const initialContractBalance = await ethers.provider.getBalance(walletAddress);

    // User puts 2 ether with unlock time 0 (immediately available)
    const putTx = await walletInstance.connect(user).Put(0, { value: ethers.parseEther("2") });
    await putTx.wait();

    // Verify user has balance in contract
    const userAcc = await walletInstance.Acc(user.address);
    expect(userAcc.balance).to.equal(ethers.parseEther("2"));

    // Now collect 1 ether
    const collectTx = await walletInstance.connect(user).Collect(ethers.parseEther("1"));
    await collectTx.wait();

    // Check final balances
    const finalUserBalance = await ethers.provider.getBalance(user.address);
    const finalContractBalance = await ethers.provider.getBalance(walletAddress);

    // In the original contract, user should have received 1 ether
    // In the mutant, the call always reverts, so user does NOT receive funds
    // The mutant will fail this assertion because the user's balance won't increase
    expect(finalUserBalance).to.be.gt(initialUserBalance);
    expect(finalContractBalance).to.equal(initialContractBalance - ethers.parseEther("1"));
  });
});