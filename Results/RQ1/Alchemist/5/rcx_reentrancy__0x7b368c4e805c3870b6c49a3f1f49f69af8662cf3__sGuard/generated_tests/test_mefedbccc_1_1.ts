import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant mefedbccc - Collect with failing external call", function () {
  it("should revert balance deduction when external call fails (mutant kills itself)", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy Log contract first (required constructor arg for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a contract with no receive() - will fail on receive
    const NoReceiveFactory = await ethers.getContractFactory(
      "contract NoReceive { function callCollect(address w, uint am) public { (bool success, ) = w.call(abi.encodeWithSignature(\"Collect(uint256)\", am)); require(success, \"Call failed\"); } }"
    );
    const noReceive = await NoReceiveFactory.deploy();
    await noReceive.waitForDeployment();

    // Fund noReceive in wallet's Acc mapping - need noReceive to call Put
    // First send ETH to noReceive contract
    await owner.sendTransaction({ 
      to: await noReceive.getAddress(), 
      value: ethers.parseEther("5") 
    });
    
    // noReceive calls Put on wallet to create its balance entry
    const noReceiveSigner = await ethers.getSigner(await noReceive.getAddress());
    await wallet.connect(noReceiveSigner).Put(1, { value: ethers.parseEther("2") });

    // Now noReceive has balance in wallet, try Collect
    const noReceiveBalanceBefore = await wallet.Acc(await noReceive.getAddress());
    expect(noReceiveBalanceBefore.balance).to.equal(ethers.parseEther("2"));

    // noReceive calls Collect - its receive will fail because contract has no receive function
    // On original: call fails, balance unchanged
    // On mutant: balance deducted despite failure
    await noReceive.callCollect(await wallet.getAddress(), ethers.parseEther("1"));

    const noReceiveBalanceAfter = await wallet.Acc(await noReceive.getAddress());

    // Original would keep balance at 2 ether, mutant would deduct to 1 ether
    expect(noReceiveBalanceAfter.balance).to.equal(ethers.parseEther("2"));
  });
});