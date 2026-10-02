import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mf4ab21d9 detection", function () {
  it("should revert balance update when external call fails (original) but mutant will incorrectly update", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by MONEY_BOX constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MONEY_BOX with Log address
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the contract
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).Initialized();
    
    // Deploy a malicious receiver contract that rejects Ether
    const RejectorFactory = await ethers.getContractFactory("contract Rejector { receive() external payable { revert(); } }");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();
    
    // Fund the contract via attacker putting ETH
    await instance.connect(attacker).Put(0, { value: ethers.parseEther("1") });
    
    // Check initial balance before collect attempt
    const holderBefore = await instance.Acc(attacker.address);
    const initialBalance = holderBefore.balance;
    
    // Attempt Collect from the rejector contract address (which will fail on receive)
    const rejectorSigner = await ethers.getImpersonatedSigner(await rejector.getAddress());
    await owner.sendTransaction({
      to: await rejector.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Fund the rejector so it can call Collect
    await instance.connect(rejectorSigner).Put(0, { value: ethers.parseEther("0.5") });
    
    // Try to collect - this will trigger a call to the rejector which will revert
    const tx = instance.connect(rejectorSigner).Collect(ethers.parseEther("0.2"));
    
    // Original contract: should not update balance because call fails
    // Mutant: will update balance incorrectly because it uses if(true)
    await expect(tx).to.not.changeEtherBalance(
      rejectorSigner,
      ethers.parseEther("0.2"),
      "Balance should not change when external call fails"
    );
    
    // Verify balance was NOT deducted (original behavior)
    const holderAfter = await instance.Acc(rejectorSigner.address);
    expect(holderAfter.balance).to.equal(ethers.parseEther("0.5"));
    
    // Verify no Collect message was logged (original behavior)
    const historyLength = await logInstance.History.length;
    expect(historyLength).to.equal(1); // Only the Put message, no Collect
  });
});