import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant mefedbccc test", function () {
  it("should detect mutant where _s is replaced with true - balance deducted even on failed call", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with the Log contract address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a contract that will reject Ether and can call Collect
    const ProxyFactory = await ethers.getContractFactory(
      "contract Proxy { function attack(address wallet, uint amount) external { (bool success, ) = wallet.call(abi.encodeWithSignature('Collect(uint256)', amount)); require(success); } fallback() external payable { revert(); } receive() external payable { revert(); } }"
    );
    const proxy = await ProxyFactory.deploy();
    await proxy.waitForDeployment();

    // Fund the proxy so it can put money into wallet
    const putAmount = ethers.parseEther("2");
    await owner.sendTransaction({ to: await proxy.getAddress(), value: putAmount });

    // Proxy puts money into wallet
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock.timestamp + 100; // Set future unlock time

    await proxy.connect(owner).Put(unlockTime, { value: putAmount });

    // Verify balance was recorded
    let holder = await wallet.Acc(await proxy.getAddress());
    expect(holder.balance).to.equal(putAmount);

    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine");

    // Proxy calls Collect - the call will fail because proxy's fallback/receive reverts
    const collectAmount = ethers.parseEther("1");
    await proxy.connect(owner).attack(await wallet.getAddress(), collectAmount);

    // Check balance after failed Collect attempt
    holder = await wallet.Acc(await proxy.getAddress());

    // In original contract, balance would still be putAmount (1 ETH not deducted)
    // In mutant, balance would be putAmount - collectAmount (deducted even though transfer failed)
    // Therefore, if balance is less than putAmount, the mutant is detected
    expect(holder.balance).to.equal(putAmount); // This will fail on mutant, detecting it
  });
});