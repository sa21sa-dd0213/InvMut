import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MONEY_BOX mutant detection test", function () {
    it("should revert Collect when external call fails (detect mutant removing revert)", async function () {
        const [owner, attacker] = await ethers.getSigners();
        
        // Deploy Log contract first (no constructor arguments)
        const LogFactory = await ethers.getContractFactory("Log");
        const log = await LogFactory.deploy();
        await log.waitForDeployment();
        
        // Deploy MONEY_BOX with Log address as constructor argument
        const Factory = await ethers.getContractFactory("MONEY_BOX");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        
        // Set up the contract
        await instance.SetLogFile(await log.getAddress());
        await instance.SetMinSum(ethers.parseEther("1"));
        await instance.Initialized();
        
        // Create a malicious contract that rejects ether
        const MaliciousFactory = await ethers.getContractFactory("MaliciousReceiver");
        const malicious = await MaliciousFactory.deploy();
        await malicious.waitForDeployment();
        
        // Fund the malicious contract so it can put ether
        await owner.sendTransaction({
            to: await malicious.getAddress(),
            value: ethers.parseEther("10")
        });
        
        // Put ether into MONEY_BOX from malicious contract
        await malicious.connect(owner).putEther(await instance.getAddress(), ethers.parseEther("5"), 0);
        
        // Wait for unlock time to pass (lock time was 0)
        await ethers.provider.send("evm_increaseTime", [3600]);
        await ethers.provider.send("evm_mine", []);
        
        // Attempt to collect - this should revert because the external call fails
        // In the mutant, it would NOT revert and would deduct balance
        await expect(
            malicious.connect(owner).collectAttempt(await instance.getAddress(), ethers.parseEther("2"))
        ).to.be.reverted;
        
        // Verify balance wasn't deducted (should still be 5 ether)
        const holder = await instance.Acc(await malicious.getAddress());
        expect(holder.balance).to.equal(ethers.parseEther("5"));
    });
});

// Helper contract to receive ether but reject when called via call{}
contract MaliciousReceiver {
    function putEther(address moneyBox, uint amount, uint lockTime) external {
        (bool success, ) = moneyBox.call{value: amount}(abi.encodeWithSignature("Put(uint256)", lockTime));
        require(success, "Put failed");
    }
    
    function collectAttempt(address moneyBox, uint amount) external {
        (bool success, ) = moneyBox.call(abi.encodeWithSignature("Collect(uint256)", amount));
        require(success, "Collect failed");
    }
    
    receive() external payable {
        revert("Rejecting ether");
    }
    
    fallback() external payable {
        revert("Rejecting ether");
    }
}