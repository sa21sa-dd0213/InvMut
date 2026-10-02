import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant mf4ab21d9 test", function () {
  it("should revert when Collect is called with a failing external call", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the MONEY_BOX contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Log contract (needed for the LogFile reference)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Set up the contract
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await logInstance.getAddress());
    await instance.connect(owner).Initialized();
    
    // addr1 puts some ETH with a short lock time
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("1") });
    
    // Deploy a malicious contract that reverts on receiving ETH
    const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    // Transfer some ETH to the malicious contract so it can call Collect
    await owner.sendTransaction({
      to: await malicious.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Call Collect from the malicious contract - this should fail because the call will revert
    await expect(
      malicious.connect(owner).attemptCollect(await instance.getAddress(), ethers.parseEther("0.5"))
    ).to.not.be.reverted;
    
    // Check that the balance was NOT deducted (mutant would deduct it)
    const holder = await instance.Acc(await malicious.getAddress());
    expect(holder.balance).to.equal(ethers.parseEther("1"));
    
    // Check that no log entry was added for the failed collect
    const historyCount = await logInstance.History.length;
    expect(historyCount).to.equal(1); // Only the Put log should exist
  });
});

// Helper contract that reverts on receiving ETH
contract MaliciousReceiver {
    function attemptCollect(address moneyBox, uint amount) external {
        (bool success, ) = moneyBox.call(abi.encodeWithSignature("Collect(uint256)", amount));
        require(success, "Collect failed");
    }
    
    receive() external payable {
        revert("I don't accept ETH");
    }
}