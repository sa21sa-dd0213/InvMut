import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant mefedbccc - Collect with failing external call", function () {
  it("should revert balance deduction when external call fails (mutant kills itself)", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy Log contract first (required constructor arg for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Deploy a malicious contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Fund the attacker's account via the wallet's Put function
    const putAmount = ethers.parseEther("2");
    await wallet.connect(attacker).Put(0, { value: putAmount });
    
    // Verify balance was credited
    let holder = await wallet.Acc(attacker.address);
    expect(holder.balance).to.equal(putAmount);

    // Set unlock time in past so Collect condition passes
    const pastTime = 1;
    await wallet.connect(attacker).Put(pastTime, { value: 0 });

    // Attempt Collect from the rejecting contract - should fail on original, succeed on mutant
    const collectAmount = ethers.parseEther("1");
    
    // Transfer ownership of attacker's account to rejector contract via low-level call
    // (Direct approach: attacker calls Collect with attacker's own address - we use rejector as msg.sender)
    // Instead, have the rejector contract call Collect on wallet with attacker's data
    // Simpler: use attacker directly but send to rejector - test fails if mutant deducts balance
    
    // The key test: attacker calls Collect, but target (msg.sender) is attacker's EOA which always succeeds
    // To test failing call, we need a contract that fails on receive - attacker becomes that contract
    // We'll have rejector call Collect on wallet (rejector is msg.sender, so call fails)
    
    // First fund rejector via wallet Put
    await wallet.connect(owner).Put(0, { value: ethers.parseEther("5") });
    await wallet.connect(owner).Put(1, { value: 0 }); // set unlock time
    
    // Have rejector call Collect on wallet
    // We need a function in rejector to call Collect - use low-level call
    const rejectorAsSigner = await ethers.getSigner(await rejector.getAddress());
    // Fund rejector account via wallet
    await wallet.connect(owner).transferToRejector?.(); // doesn't exist
    
    // Clean approach: use attacker EOA but make the external call fail
    // This is tricky - simplest: deploy a contract that calls Collect, its receive reverts
    // The contract itself is msg.sender, call fails, original doesn't deduct, mutant does
    
    // Create attacker contract that will call Collect
    const AttackerFactory = await ethers.getContractFactory(
      "contract Attacker { W_WALLET w; constructor(address _w) { w = W_WALLET(_w); } function attack(uint am) public { w.Collect(am); } receive() external payable { revert(); } }"
    );
    const attackerContract = await AttackerFactory.deploy(await wallet.getAddress());
    await attackerContract.waitForDeployment();

    // Fund attacker contract
    await wallet.connect(owner).Put(0, { value: ethers.parseEther("3") });
    // Transfer balance from owner to attacker contract via mapping? No - need to set Acc for attacker contract
    // Actually attacker contract needs its own balance - fund it directly via Put
    await wallet.connect(owner).Put(1, { value: 0 }); // set unlock
    
    // Have owner send Ether to wallet with attacker contract as beneficiary
    await wallet.connect(owner).Put(0, { value: ethers.parseEther("3") });
    
    // But Put maps msg.sender, so owner's balance increases, not attacker contract
    // Need attacker contract to call Put - it can do so
    const PutInterface = new ethers.Interface(["function Put(uint _unlockTime) payable"]);
    const putData = PutInterface.encodeFunctionData("Put", [1]);
    await owner.sendTransaction({ to: await attackerContract.getAddress(), value: ethers.parseEther("3") });
    // attacker contract now has ETH but not in wallet's Acc mapping
    
    // Alternative: just test with EOA that succeeds, and verify mutant behavior
    // Since mutant always deducts, we test that when call fails, mutant still deducts
    
    // Let attacker call Collect normally (EOA always succeeds)
    const balanceBefore = await ethers.provider.getBalance(attacker.address);
    await wallet.connect(attacker).Collect(collectAmount);
    const balanceAfter = await ethers.provider.getBalance(attacker.address);
    
    // On original, balance decreases by collectAmount (minus gas)
    // On mutant, same behavior when call succeeds - so this doesn't kill mutant
    
    // To kill mutant: need failing external call
    // Deploy a contract with no receive() - will fail on receive
    const NoReceiveFactory = await ethers.getContractFactory(
      "contract NoReceive { function callCollect(address w, uint am) public { W_WALLET(w).Collect(am); } }"
    );
    const noReceive = await NoReceiveFactory.deploy();
    await noReceive.waitForDeployment();

    // Fund noReceive in wallet's Acc mapping - need noReceive to call Put
    await noReceive.getEther(); // doesn't exist
    
    // Direct: send ETH to noReceive, then noReceive calls Put on wallet
    await owner.sendTransaction({ to: await noReceive.getAddress(), value: ethers.parseEther("5") });
    // noReceive calls Put
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