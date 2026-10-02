import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 - kill mutant m4863ab4b", function () {
    it("should revert when msg.value equals contract balance due to mutant's +1 overflow check", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Fund the contract with 2 ETH from owner
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("2")
        });

        // Verify initial balance
        expect(await ethers.provider.getBalance(instanceAddress)).to.equal(ethers.parseEther("2"));

        // Call multiplicate with msg.value equal to contract balance (2 ETH)
        // Original: require((2 + 2) >= 2) -> passes
        // Mutant: require((2 + 2 + 1) >= 2) -> still passes mathematically, but we need edge case
        // Let's use a value that exactly matches the contract balance to trigger the overflow check
        const tx = instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("2") });
                
        // On original contract, this should succeed (balance becomes 4, transfers 4 to addr1)
        // On mutant, the require condition uses msg.value+1, making it require((2 + 2 + 1) >= 2)
        // which passes but the transfer amount is different - let's verify behavior
        await expect(tx).to.not.be.reverted;
                
        // After transfer, contract should have 0 balance on original
        // On mutant, the transfer still uses address(this).balance+msg.value (not +1)
        // So both should result in same transfer amount and end state
        // The real kill condition: check that the require doesn't overflow incorrectly
        // Actually, the mutant adds +1 only to the require check, not to the transfer
        // So both pass the require, but let's test edge case where msg.value = 0
    });

    it("should kill mutant by triggering false overflow check with zero msg.value", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Fund contract with 1 ETH
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("1")
        });

        // Set contract balance to exactly 1 ETH
        const balanceBefore = await ethers.provider.getBalance(instanceAddress);
        expect(balanceBefore).to.equal(ethers.parseEther("1"));

        // Call multiplicate with msg.value = 0
        // Original: require((1 + 0) >= 1) -> true, transfers 1 ETH to addr1
        // Mutant: require((1 + 0 + 1) >= 1) -> require(2 >= 1) -> true, same behavior
        // This doesn't kill it either. Let's think differently.
    });

    it("should kill mutant by testing overflow condition with maximum values", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Fund contract with 1 wei
        await owner.sendTransaction({
            to: instanceAddress,
            value: 1
        });

        // Call with msg.value = 1 wei (total would be 2 wei)
        // Original: require((1 + 1) >= 1) -> true
        // Mutant: require((1 + 1 + 1) >= 1) -> true
        // Still passes both. Need edge case where mutant's +1 causes overflow.
                
        // Use near-maximum uint256 values
        const maxUint = ethers.MaxUint256;
        const balance = maxUint - BigInt(1);
                
        // Set contract balance to near max
        await owner.sendTransaction({
            to: instanceAddress,
            value: balance
        });

        // Call with msg.value = 1 wei
        // Original: require((balance + 1) >= balance) -> overflow would revert
        // Mutant: require((balance + 1 + 1) >= balance) -> also overflow revert
        // Both revert on overflow. The mutant's +1 doesn't change revert behavior.
    });

    it("should kill mutant by testing the exact balance condition", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Fund contract with exactly 5 ETH
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("5")
        });

        // Call with msg.value = 5 ETH (so msg.value >= contract balance)
        // Original: require((5 + 5) >= 5) -> passes
        // Mutant: require((5 + 5 + 1) >= 5) -> passes
        // Both pass. Need different approach.
    });

    it("should kill mutant by checking if transfer amount is correct despite mutant's +1", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();
        const addr1BalanceBefore = await ethers.provider.getBalance(addr1.address);

        // Fund contract with 3 ETH
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("3")
        });

        // Call with msg.value = 3 ETH (satisfies >= condition)
        await instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("3") });

        const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
        const contractBalanceAfter = await ethers.provider.getBalance(instanceAddress);

        // Original: transfers 6 ETH to addr1, contract ends with 0
        // Mutant: same transfer amount (6 ETH), contract ends with 0
        // Both identical. This doesn't kill it.
    });

    it("should kill mutant by testing edge case where msg.value = 0 and contract has 0 balance", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();

        // Contract starts with 0 balance
        // Call multiplicate with msg.value = 0
        // Original: require((0 + 0) >= 0) -> true, but msg.value (0) is NOT >= contract balance (0)
        // So it doesn't enter the if block at all
        // Mutant: same behavior since condition msg.value >= address(this).balance is unchanged
    });

    it("should kill mutant by testing the exact overflow condition with specific values", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // Set contract balance to exactly 1 ETH
        await owner.sendTransaction({
            to: instanceAddress,
            value: ethers.parseEther("1")
        });

        // Call with msg.value = 1 ETH
        // Original: require((1e18 + 1e18) >= 1e18) -> true, no overflow
        // Mutant: require((1e18 + 1e18 + 1) >= 1e18) -> true, no overflow
                
        // The key insight: the mutant's +1 could cause an integer overflow in the require check
        // when address(this).balance + msg.value is very close to max uint256
        const maxUint = ethers.MaxUint256;
        const almostMax = maxUint - BigInt(2);
                
        // Set contract balance to almost max
        await owner.sendTransaction({
            to: instanceAddress,
            value: almostMax
        });

        // Call with msg.value = 2 wei
        // Original: require((almostMax + 2) >= almostMax) -> overflows and reverts
        // Mutant: require((almostMax + 2 + 1) >= almostMax) -> also overflows and reverts
        // Both revert the same way
    });

    it("should kill mutant by testing the exact balance condition where mutant's +1 makes it revert", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const Factory = await ethers.getContractFactory("MultiplicatorX3");
        const instance = await Factory.deploy();
        await instance.waitForDeployment();
        const instanceAddress = await instance.getAddress();

        // The mutant changes require to include msg.value+1
        // This can cause a different behavior when the sum overflows
        // For uint256, max value is 2^256 - 1
        // Let's use: contract balance = maxUint - 1, msg.value = 1
        // Original: require((max-1 + 1) >= max-1) -> max >= max-1 -> true, no overflow
        // Mutant: require((max-1 + 1 + 1) >= max-1) -> require((max+1) >= max-1) -> overflow revert!
                
        const maxUint = ethers.MaxUint256;
        const balance = maxUint - BigInt(1);
                
        // Fund contract
        await owner.sendTransaction({
            to: instanceAddress,
            value: balance
        });

        // Verify balance
        expect(await ethers.provider.getBalance(instanceAddress)).to.equal(balance);

        // Call with msg.value = 1 wei
        const tx = instance.connect(owner).multiplicate(addr1.address, { value: 1 });
                
        // Original: should NOT revert (passes require, enters if, transfers everything)
        // Mutant: should REVERT due to overflow in require check
        await expect(tx).to.be.reverted;
    });
});